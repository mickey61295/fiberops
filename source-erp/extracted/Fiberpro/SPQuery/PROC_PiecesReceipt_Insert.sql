/*;=============================================   
; Author           :  Global Software's    
; Create date      :  19/01/2023    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  ASLAM
; Last Change Date :  29/12/2025 11.35 AM 
; =============================================  */  

CREATE PROCEDURE PROC_PiecesReceipt_Insert (@Id Int,@StyleNo Varchar(20),@ColID Int,@PartId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15), @RewrkPcs INT = 0,@RejPcs INT = 0) AS  DECLARE @Coycode int, @Partyid int,@Ordid int,@Stageid int,@GodId int,@SeqNo int,@StockQty int ,@SourceStageid int ,@GrnType varchar(20),@PcsStockId Int,@FinalStage Varchar(5),@StageId1 Int,@ProcessType Char(1),@RejectionTypeId Int ,@DCTargetStageID int ,@DcPartID Int  ,@LotId Int ,@SemiFinishDept Varchar(1), @ReWrkStock int,@RejStock int   


SELECT @Coycode = Coycode From Trs_PcsGrn1 where id=@id    
SELECT @Partyid = Party from trs_Pcsgrn1 where id=@id    
SELECT @Ordid = OrdJob from Trs_PcsGrn1 where id=@id        
SELECT @StageId = TargetStageId FROM Trs_PcsGrn1 where id =@id      
SELECT @GodId = GodId FROM Trs_PcsGrn1 where id =@id      
SELECT @ProcessType = ProcessType FROM Trs_PcsGrn1 where id =@id  
IF ltrim(@LotNo)<>''  
	SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo) 
ELSE 
	SELECT @LotId = 0 

SELECT @RejectionTypeId = Trs_Pcs1.RejectionTypeId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And  Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id  
print 'a1'
print @RejectionTypeId

SELECT @DcPartID = Trs_Pcs2.PartID from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And
 Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo  And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID and Trs_Pcs2.SizeID = Trs_PcsGrn2.SizID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id   


Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@Stageid    

SELECT @SourceStageid = Trs_Pcs2.SourceStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id  

SELECT @StockQty = @Pcs   
SELECT @ReWrkStock = @RewrkPcs   
SELECT @RejStock = @RejPcs   
Select @GrnType = GrnType from trs_pcsgrn1 where id=@id   
Select @FinalStage = Mas_Dept.SEMIFINISH From Mas_Dept Inner Join Mas_JobWrkComp On Mas_Dept.DeptID=Mas_JobWrkComp.DeptId Where Id=@StageId 
Select @SemiFinishDept=Mas_Dept.SEMIFINISH From Mas_Dept INNER JOIN Trs_PcsGrn1 ON Trs_PcsGrn1.Dept=Mas_Dept.DeptID Where Trs_PcsGrn1.ID=@Id 


If @GrnType='Process Return'     
BEGIN  /*Insert into tmp_trg Values ('START')*/      
If @SemiFinishDept='F'         
Select @StageId1 = Trs_Pcs1.TargetStageId From Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs2.StyleNo=Trs_PcsGrn2.
StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo    Where Trs_PcsGrn1.id=@id       
Else       
Select @StageId1 = Trs_Pcs1.TargetStageId From Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id      
END   
Else    
BEGIN   
Select @DCTargetStageID = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo WHERE Trs_PcsGrn1.id=@id  /*Insert into tmp_trg Values ('START1-Source ' + str(@DCTarget
StageID))  Insert into tmp_trg Values ('START1') */  SELECT @StageId1 = TargetStageId FROM Trs_PcsGrn1 where id =@id   /*Insert into tmp_trg Values ('START1 ' + str(@StageId1)) */    
END    
BEGIN  
If @FinalStage='S'    
BEGIN   /*Insert into tmp_trg Values ('START2')*/     
If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Panel' 
BEGIN   
if @ProcessType='R'   
BEGIN   
/* test */
print 'a2'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty = Pcs_StockTableQty.StockQty - @StockQty ,Pcs_StockTableQty.ProductionQty =Pcs_StockTableQty.ProductionQty+ @StockQty, Pcs_StockTableQty.RewrkStk = isnull(Pcs_StockTableQty.RewrkStk,0) - @ReWrkStock
 , Pcs_StockTableQty.RejStk = isnull(Pcs_StockTableQty.RejStk,0) - @RejStock From Pcs_StockTableQty  Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID
 = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@Partyid and Pcs_StockTableQty.ColId=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId   And ISNULL(Pcs_StockTable.EmpID,0) = 0
End     
END  
If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Bit' OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Panel'  

BEGIN   /*Insert into tmp_trg Values ('START3') */   
/* test */
If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0)     
BEGIN    /*Insert into tmp_trg Values ('START4') */    
/* test */
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0
/* test */
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode 
and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID  and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0) 

BegiN   /*Insert into tmp_trg Values ('START5')  Insert into tmp_trg Values ('UPDATE1 +' +str(@StockQty)) */  
/* Test */
print 'a3'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty, Pcs_StockTableQty.ProductionQty =Pcs_StockTableQty.ProductionQty+@StockQty, Pcs_StockTableQty.RewrkStk = isnull(Pcs_StockTableQty.RewrkStk,0) + @ReWrkStock  , Pcs_StockTableQty.RejStk = isnull(Pcs_StockTableQty.RejStk,0) + @RejStock   From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0 

if @ProcessType='R'   /*Insert into tmp_trg Values ('UPDATE55 -' + str(@Stockqty) )  */   
BEGIN   
/* test */
print 'a4'
/* For Piece Again Open this query for Esa -> reprocess grn time - qty not reduced from party - 29-12-2025 */
/* commented on 16-dec-2025 - esa panel error embellish - io : 52 / dc no- 449 */
if (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' 
begin
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty = Pcs_StockTableQty.StockQty -@StockQty ,Pcs_StockTableQty.ProductionQty =Pcs_StockTableQty.ProductionQty+ @StockQty, Pcs_StockTableQty.RewrkStk = isnull(Pcs_StockTableQty.RewrkStk,0) - @ReWrkStock  
, Pcs_StockTableQty.RejStk = isnull(Pcs_StockTableQty.RejStk,0) - @RejStock  From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID
 = @LotID and PartId=@PartId and GodId=@GodId and PartyId=@Partyid and Pcs_StockTableQty.ColId=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId  And Pcs_StockTable.StageId	= @Stageid  And ISNULL(Pcs_StockTable.EmpID,0) = 0
end 


 if @DCTargetStageID <> @StageId1  
BEGIN  
/* Test */
print 'a5'
  Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty , Pcs_StockTableQty.RewrkStk = isnull(Pcs_StockTableQty.RewrkStk,0) + @ReWrkStock  , Pcs_StockTableQty.RejStk = isnull(Pcs_StockTableQty.RejStk,0) + @RejStock  
From Pcs_StockTableQty   Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo
=@StyleNo and LotId = @LotID and Stageid=@DCTargetStageID and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and   Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and
 IsNull(RejectionTypeId,0)=@RejectionTypeId And ISNULL(Pcs_StockTable.EmpID,0) = 0
END  
End     
End      
Else     
Begin   /*Insert into tmp_trg Values ('INSERT1') */    
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,RewrkStk,RejStk) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@ReWrkStock,@RejStock)     

 if @DCTargetStageID <> @StageId1  
BEGIN  
/* test */
print 'a6'
  Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-(@StockQty + @ReWrkStock + @RejStock)  From Pcs_StockTableQty   Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode
 and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@DCTargetStageID and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and   Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and
 IsNull(RejectionTypeId,0)=@RejectionTypeId And ISNULL(Pcs_StockTable.EmpID,0) = 0
END  

Else /* In PcsStockTable(Rework) Reduse StkQty When Multiple Stage Chosen in PcsGrn */
BEGIN
if @ProcessType='R'  And @GrnType='Process Receipt' 
BEGIN 
/*test */
print 'a7'
  Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-(@StockQty + @ReWrkStock + @RejStock)  From Pcs_StockTableQty   Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode
 and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@StageId1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and   Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId And ISNULL(Pcs_StockTable.EmpID,0) = 0
END

END
End      
END         
Else      
begin 
Select @PcsStockId=IsNull(Max(PcsStockId)+1,0) From Pcs_StockTable   /*Insert into tmp_trg Values ('INSERT2')*/   
INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID)   VALUES (@Coycode,@Ordid,@StyleNo,   @Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,0,@LotID)  
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,ReWrkStk,RejStk) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@ReWrkStock,@RejStock)  

if @ProcessType='R'
BEGIN
 if @DCTargetStageID <> @StageId1  
BEGIN  
/* test */
print 'a8'
  Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty, Pcs_StockTableQty.RewrkStk = isnull(Pcs_StockTableQty.RewrkStk,0) - @ReWrkStock  , Pcs_StockTableQty.RejStk = isnull(Pcs_StockTableQty.RejStk,0) - @RejStock  From Pcs_StockTableQty   Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo
=@StyleNo and LotId = @LotID and Stageid=@DCTargetStageID and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and   Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId And ISNULL(Pcs_StockTable.EmpID,0) = 0
END 
END
End   
END   
BEGIN  /*Insert into tmp_trg Values ('START6')*/   
/* test */
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@StageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = 0     
If @GrnType='Process Return'    
BEGIN   /*Insert into tmp_trg Values ('UPDATE2 -' + str(@StockQty)) */    
/* test */
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty, Pcs_StockTableQty.RewrkStk = isnull(Pcs_StockTableQty.RewrkStk,0) - @ReWrkStock  , Pcs_StockTableQty.RejStk = isnull(Pcs_StockTableQty.RejStk,0) - @RejStock  From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and      Stageid=@StageId1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End   And ISNULL(Pcs_StockTable.EmpID,0) = 0 
END   
Else   
BEGIN   
if @ProcessType<>'R'  
BEGIN  /*Insert into tmp_trg Values ('UPDATE3 -' + str(@DCTargetStageID)) */ 	 if @DCTargetStageID <> @StageId1  
BEGIN  /*Insert into tmp_trg Values ('UPDATE31 -' ) */  

/* test */
print 'a9'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-(@StockQty +  @ReWrkStock  + @RejStock )  From Pcs_StockTableQty   Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@DCTargetStageID and PartId=@PartId and GodId=@GodId and
 PartyId=@PartyId and   Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and
IsNull(RejectionTypeId,0)=0   And ISNULL(Pcs_StockTable.EmpID,0) = 0
END  
Else    

begin  /*Insert into tmp_trg Values ('UPDATE32 -' ) */  
/* test */
print 'a10'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty- (@StockQty +  @ReWrkStock  + @RejStock )  From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId
 where   coycode=@coycode and  Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotId and Pcs_StockTable.Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0   and ( Pcs_StockTableQty.StockQty>0   OR  Pcs_StockTableQty.ReWrkStk>0 OR  Pcs_StockTableQty.RejStk>0) And ISNULL(Pcs_StockTable.EmpID,0) = 0

end 
END 
else 
BEGIN   
if @ProcessType<>'R' 
begin 
/* test */
print 'a11'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty = Pcs_StockTableQty.StockQty -@StockQty ,Pcs_StockTableQty.ProductionQty =Pcs_StockTableQty.ProductionQty+ @StockQty, Pcs_StockTableQty.RewrkStk = isnull(Pcs_StockTableQty.RewrkStk,0) - @ReWrkStock  , Pcs_StockTableQty.RejStk = isnull(Pcs_StockTableQty.RejStk,0) - @RejStock  From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo
 and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@Partyid and Pcs_StockTableQty.ColId=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId    And
 ISNULL(Pcs_StockTable.EmpID,0) = 0

END

END       
END    
END  

END    

If @FinalStage='F'   
BEGIN   
If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Piece'   or (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Bit'     OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Panel' 
Begin       
/* test */
If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotId and Stageid=@Stageid and GodId=@GodId and PartyId=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0)    
begin  
/* test */
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@Stageid and GodId=@GodId and PartyId=0     And ISNULL(Pcs_StockTable.EmpID,0) = 0


/* test */
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and GodId=@GodId and PartyId=0 and Pcs_StockTableQty.ColId=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0)  

Begin  /*Insert into tmp_trg Values ('UPDATE155 +' + str(@Stockqty) )  */ 
/* test */
	Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty = Pcs_StockTableQty.StockQty +@StockQty ,Pcs_StockTableQty.ProductionQty =Pcs_StockTableQty.ProductionQty+ @StockQty , Pcs_StockTableQty.RewrkStk = isnull(Pcs_StockTableQty.RewrkStk,0) + @ReWrkStock


  , Pcs_StockTableQty.RejStk = isnull(Pcs_StockTableQty.RejStk,0) + @RejStock 	

From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and GodId=@GodId and PartyId=0 and Pcs_StockTableQty.ColId=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0  And ISNULL(Pcs_StockTable.EmpID,0) = 0

if @ProcessType='R'   /*Insert into tmp_trg Values ('UPDATE55 -' + str(@Stockqty) ) */ 	
begin 	 
print 'a12'	
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty =

/* test */
 Pcs_StockTableQty.StockQty -@StockQty , Pcs_StockTableQty.ProductionQty =Pcs_StockTableQty.ProductionQty+ @StockQty, Pcs_StockTableQty.RewrkStk = isnull(Pcs_StockTableQty.RewrkStk,0) - @ReWrkStock  , Pcs_StockTableQty.RejStk = isnull(Pcs_StockTableQty.RejStk,0) - @RejStock  From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID	 and Stageid=@Stageid and GodId=@GodId and PartyId=@Partyid and Pcs_StockTableQty.ColId=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId   and PartId=@PartId And ISNULL(Pcs_StockTable.EmpID,0) = 0

End  

End   
Else   

	 Begin   
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,RewrkStk,RejStk) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@ReWrkStock,@RejStock)   
End    

End  
Else   
begin   
Select @PcsStockId=ISnull(MAx(PcsstockID)+1,0) From Pcs_StockTable   

INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,0,@LotID)
    INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,ReWrkStk,RejStk) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@ReWrkStock,@RejStock)   


End  
End    

Begin   
/* test */
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and  LotID = @LotId and Stageid=@StageId and GodId=@GodId and PartyId=@PartyId    And ISNULL(Pcs_StockTable.EmpID,0) = 0
If @GrnType='Process Return'     

Begin   
/* test */
print 'a13'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty, Pcs_StockTableQty.RewrkStk = isnull(Pcs_StockTableQty.RewrkStk,0) - @ReWrkStock  , Pcs_StockTableQty.RejStk = isnull(Pcs_StockTableQty.RejStk,0) - @RejStock   From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@StageId1 and LotId = @LotId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@ColId and    Pcs_StockTableQty.SizeId=@SizeId  and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P'  Then 0 Else @RejectionTypeId End And ISNULL(Pcs_StockTable.EmpID,0) = 0  End  


Else  
Begin   /*Insert into tmp_trg Values ('UPDATE555 -' + str(@Stockqty) )  Insert into tmp_trg Values ('UPDATE 555stage -' + str(@StageId1) )  Insert into tmp_trg Values ('UPDATE555stage -' + str(@DcPartID) ) Insert into tmp_trg Values ('UPDATE7555stage -' + str(@Partyid) )*/ 

If @FinalStage='F'     
begin     
/* test */
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty, Pcs_StockTableQty.RewrkStk = isnull(Pcs_StockTableQty.RewrkStk,0) - @ReWrkStock  , Pcs_StockTableQty.RejStk = isnull(Pcs_StockTableQty.RejStk,0) - @RejStock  From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId
 where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and  LotId = @LotID and Stageid=@StageId1 and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and PartId=@DcPartID And ISNULL(Pcs_StockTable.EmpID,0) = 0  
  end  
else     
begin 
/* Test */
print 'a14'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty- (@StockQty +  @ReWrkStock + @RejStock)   From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode 
and Ordid=@Ordid and StyleNo=  @StyleNo and LotId = @LotID and Stageid=@StageId1 and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 
and PartId=@PartId   And ISNULL(Pcs_StockTable.EmpID,0) = 0
End  
End   
End   
End   
END 

