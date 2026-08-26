/*;=============================================   

; Author           :  Global Software's    

; Create date      :  19/01/2023    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  ASLAM

; Last Change Date :  23/11/2024 09.30 AM 

; =============================================  */  
CREATE PROCEDURE PROC_PiecesReceipt_Delete (@ID Int) AS DECLARE @Ordid Int,@StageId Int,@GodId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@StageId1 Int,@GrnType varchar(50),@ProcessType Char(1),@RejectionTypeId Int ,@DCTargetStageId int ,@LotId int,@coycode int,@PanelId Int,@StyleNo Varchar(20),@ColId int,@SizeId int,@PartID Int,@Pcs Int,@LotNo Varchar(15),@RewrkPcs int,@RejPcs int ,@cutGrn char(1)
Select @Id=@ID  
Select @Coycode = Coycode FROM Trs_PcsGrn1 where id=@id    
select @Partyid = Party from Trs_PcsGrn1 where id=@id   
SELECT @Ordid = OrdJob from Trs_PcsGrn1 where id=@id   
SELECT @StyleNo = @StyleNo  
SELECT @Stageid = TargetStageID from Trs_PcsGrn1 where id=@id   
SELECT @PartId = @PartId  
SELECT @GodId = GodId from Trs_PcsGrn1 where id=@id  
SELECT @ProcessType = ProcessType from Trs_PcsGrn1 where id=@id   
SELECT @cutGrn = IsNull(JobWrkCuttingGrn,'N') from Trs_PcsGrn1 where id=@id   
SELECT @RejectionTypeId = Trs_Pcs1.RejectionTypeId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id  
Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@Stageid  SELECT @colid = @Colid 
SELECT @Sizeid = @Sizeid    
SELECT @StockQty = @Pcs   
SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_PcsGrn1 Inner Join Mas_JobWrkComp On Trs_PcsGrn1.TargetStageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsGrn1.Id=@Id   
Select @GrnType = GrnType from trs_pcsgrn1 where id=@id   
SELECT @DCTargetStageId = Trs_Pcs1.TargetStageID from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id   
BEGIN   
DECLARE LINE_CURSOR_DELETE CURSOR FOR   
Select Id,StyleNo,Colid,PartId,SizId,IsNull(lotNo,'') LotNo,RecPcs,isnull(RewrkPcs,0) as RewrkPcs , IsNull(RejPcs,0) as RejPcs FROM Trs_PcsGrn2 Where ID=@Id   
OPEN LINE_CURSOR_DELETE   
FETCH NEXT FROM LINE_CURSOR_DELETE INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs,@ReWrkPcs,@RejPcs     
WHILE @@FETCH_STATUS = 0     
BEGIn  
if ltrim(@LotNo)<>''  	
SELECT @LotID = LotSno from mas_Lot where LotName=LTrim(@LotNo)  	
else 	
SELECT @LotId = 0  
If @GrnType='Process Return'  
Begin  
select @StageId1 = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id  
End  
Else  
Begin 
SELECT @StageId1 = TargetStageId From Trs_PcsGrn1 Where Id=@Id  
End  
BEGIN      
If @FinalStage='S'  	
begin     		
If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Piece' OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Bit'  
Begin  	
if @DCTargetStageId <> @StageId   
 begin
if @ProcessType='R'  
begin
print 'a'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+ @Pcs,
Pcs_StockTableQty.ReWrkStk=IsNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs,Pcs_StockTableQty.RejStk=IsNull(Pcs_StockTableQty.RejStk,0) + @RejPcs
From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@DCTargetStageId And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.LotID = @LotId  WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotID  and Pcs_StockTable.Stageid=@DCTargetStageId And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId and Partyid=Trs_PcsGrn1.Party And Trs_PcsGrn1.Id=@Id  And ISNULL(Pcs_StockTable.EmpID,0) = 0
end   
else  
begin  
print 'b'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs+ @ReWrkPcs + @Rejpcs
/*Pcs_StockTableQty.ReWrkStk=IsNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs,Pcs_StockTableQty.RejStk=IsNull(Pcs_StockTableQty.RejStk,0) + @RejPcs*/
 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@DCTargetStageId And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.Stageid=@DCTargetStageId And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=Trs_PcsGrn1.Party And Trs_PcsGrn1.Id=@Id  And ISNULL(Pcs_StockTable.EmpID,0) = 0
end 
print 'c'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@Pcs,ProductionQty=Pcs_StockTableQty.ProductionQty-@Pcs ,
Pcs_StockTableQty.ReWrkStk=IsNull(Pcs_StockTableQty.ReWrkStk,0) - @ReWrkPcs,Pcs_StockTableQty.RejStk=IsNull(Pcs_StockTableQty.RejStk,0) - @RejPcs
From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=Trs_PcsGrn1.TargetStageId And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And
 Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.Stageid=Trs_PcsGrn1.TargetStageid And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=0 And Trs_PcsGrn1.Id=@Id  And ISNULL(Pcs_StockTable.EmpID,0) = 0
End 
Else  
Begin 
print 'd'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@Pcs,ProductionQty=Pcs_StockTableQty.ProductionQty-@Pcs,Pcs_StockTableQty.ReWrkStk=IsNull(Pcs_StockTableQty.ReWrkStk,0) - @ReWrkPcs,Pcs_StockTableQty.RejStk=IsNull(Pcs_StockTableQty.RejStk,0) - @RejPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=Trs_PcsGrn1.TargetStageId And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId WHERE Pcs_StockTable.coycode=Trs_PcsGrn1
.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotID  and Pcs_StockTable.Stageid=Trs_PcsGrn1.TargetStageid And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId = Trs_PcsGrn1.GodId
 and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=0 And Trs_PcsGrn1.Id=@Id   And ISNULL(Pcs_StockTable.EmpID,0) = 0

 if @cutGrn ='Y' and @Stageid = 1 and (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Piece'
 begin
 print 'dddd'
 UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs + @RewrkPcs + @RejPcs
 
 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=
Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@StageId1 And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotID  and Pcs_StockTable.Stageid=@StageId1 And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id  And ISNULL(Pcs_StockTable.EmpID,0) = 0
 end
 

End  
End  
If @GrnType='Process Return'   
Begin  
SELECT X=1 /*UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coyc


ode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@StageId1 And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.


SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.Stageid=@StageId1 And Pcs_St


ockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and I


sNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id   */
End   
Else   
If @StageId<>1   
Begin 
if @ProcessType='R' 
begin 
print 'e'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs ,
Pcs_StockTableQty.ReWrkStk=IsNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs,Pcs_StockTableQty.RejStk=IsNull(Pcs_StockTableQty.RejStk,0) + @RejPcs
From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@StageId1 And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotID 



and Pcs_StockTable.Stageid=@StageId1 And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')='M' and
 IsNull(RejectionTypeId,0)=@RejectionTypeId and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id  And ISNULL(Pcs_StockTable.EmpID,0) = 0
end  
else  
begin  
print 'f'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs + @RewrkPcs + @RejPcs
/*, Pcs_StockTableQty.ReWrkStk=IsNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs,Pcs_StockTableQty.RejStk=IsNull(Pcs_StockTableQty.RejStk,0) + @RejPcs */
 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=
Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@StageId1 And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotID  and Pcs_StockTable.Stageid=@StageId1 And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id   And ISNULL(Pcs_StockTable.EmpID,0) = 0
end  
End  
End 
If @FinalStage='F'  
Begin  
If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Piece' 
Begin  
print 'g'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@Pcs,ProductionQty=Pcs_StockTableQty.ProductionQty-@Pcs,
Pcs_StockTableQty.ReWrkStk=IsNull(Pcs_StockTableQty.ReWrkStk,0) - @ReWrkPcs,Pcs_StockTableQty.RejStk=IsNull(Pcs_StockTableQty.RejStk,0) - @RejPcs
 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=Trs_PcsGrn1.TargetStageId And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotID and Pcs_StockTable.Stageid=Trs_PcsGrn1.TargetStageid and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=0 and Pcs_StockTableQty.ColId = @ColId And Trs_PcsGrn1.Id=@Id  And ISNULL(Pcs_StockTable.EmpID,0) = 0
End 
If @GrnType='Process Return' 
Begin  
print 'h'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs , Pcs_StockTableQty.ReWrkStk=IsNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs,Pcs_StockTableQty.RejStk=IsNull(Pcs_StockTableQty.RejStk,0) + @RejPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@StageId1 And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotID and Pcs_StockTable.Stageid=@StageId1 and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id   And ISNULL(Pcs_StockTable.EmpID,0) = 0
End   
Else   
Begin   
If @StageId<>1   
Begin
if @GrnType <> 'Supplier Order Receipt'  
begin  
print 'i'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs , Pcs_StockTableQty.ReWrkStk=IsNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs,Pcs_StockTableQty.RejStk=IsNull(Pcs_StockTableQty.RejStk,0) + @RejPcs  From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_stockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId= @StageId1 And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId =



 @LotID  and Pcs_StockTable.Stageid=@StageId1 and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id   And ISNULL(Pcs_StockTable.EmpID,0) = 0
end 
End   
End   
End
   End  FETCH NEXT FROM LINE_CURSOR_DELETE INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs ,@ReWrkPcs,@RejPcs       
END  
CLOSE LINE_CURSOR_DELETE  
 DEALLOCATE LINE_CURSOR_DELETE    
SET NOCOUNT OFF  
END 
