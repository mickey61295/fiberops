/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  SWETHA

; Last Change Date :  05/07/2023 09.15 AM 

; =============================================  */  

CREATE PROCEDURE PROC_PanelReceipt_Delete (@ID Int) AS DECLARE @Ordid Int,@StageId Int,@GodId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@StageId1 Int,@GrnType varchar(50),@ProcessType Char(1),@RejectionTypeId Int ,@DCTargetStageId int ,@LotId int,@coycode int,@PanelId Int,@StyleNo Varchar(20),@ColId int,@SizeId int,@PartID Int,@Pcs Int,@LotNo Varchar(15) ,@compId int

Select @Id=@ID  

select @Coycode = Coycode FROM Trs_PcsGrn1 where id=@id    

select @Partyid = Party from Trs_PcsGrn1 where id=@id   

SELECT @Ordid = OrdJob from Trs_PcsGrn1 where id=@id   

SELECT @StyleNo = @StyleNo  

SELECT @Stageid = TargetStageID from Trs_PcsGrn1 where id=@id   

SELECT @PartId = @PartId  SELECT @GodId = GodId from Trs_PcsGrn1 where id=@id  SELECT @ProcessType = ProcessType from Trs_PcsGrn1 where id=@id   

SELECT @RejectionTypeId = Trs_Pcs1.RejectionTypeId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) where Trs_PcsGrn1.id=@id  

SELECT @compId = isNull(Trs_PcsGrn2.CompId,0) from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) where Trs_PcsGrn1.id=@id  

Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@Stageid  

SELECT @colid = @Colid 

SELECT @Sizeid = @Sizeid    

SELECT @StockQty = @Pcs   

SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_PcsGrn1 Inner Join Mas_JobWrkComp On Trs_PcsGrn1.TargetStageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsGrn1.Id=@Id   

Select @GrnType = GrnType from trs_pcsgrn1 where id=@id   

SELECT @DCTargetStageId = Trs_Pcs1.TargetStageID from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id   

BEGIN  

 DECLARE LINE_CURSOR_DELETE CURSOR FOR   
 
Select Id,StyleNo,Colid,PartId,SizId,IsNull(lotNo,'') LotNo,RecPcs,IsNull(CompId,0) CompId  FROM Trs_PcsGrn2 Where ID=@Id   

OPEN LINE_CURSOR_DELETE   

FETCH NEXT FROM LINE_CURSOR_DELETE INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs   ,@CompId  

WHILE @@FETCH_STATUS = 0     

BEGIn  

if ltrim(@LotNo)<>''  	

SELECT @LotID = LotSno from mas_Lot where LotName=LTrim(@LotNo)  	

else 	

SELECT @LotId = 0  

If @GrnType='Process Return'  

Begin  

select @StageId1 = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0)where Trs_PcsGrn1.id=@id  

print @StageId1
print '@StageId1'
End  

Else  

Begin 

SELECT @StageId1 = TargetStageId From Trs_PcsGrn1 Where Id=@Id  

End  

BEGIN      

If @FinalStage='S'  	

Begin     		

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Panel' OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Bit'  

Begin  	

if @DCTargetStageId <> @StageId    

begin  

if @ProcessType='R'  

begin

	UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+ @Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@DCTargetStageId And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID And Panel_StockTable.LotID = @LotId  WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotID  and Panel_StockTable.Stageid=@DCTargetStageId And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId and Partyid=Trs_PcsGrn1.Party And Trs_PcsGrn1.Id=@Id  
	
	print '1'
end   

else  

begin  

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@DCTargetStageId And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.Stageid=@DCTargetStageId And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID And Panel_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=Trs_PcsGrn1.Party And Trs_PcsGrn1.Id=@Id  
print '2'
end 

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty-@Pcs,ProductionQty=Panel_StockTableQty.ProductionQty-@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob  And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID inner join Trs_Pcs1 on Trs_PcsGrn1.Ourdcref = Trs_Pcs1.ID INNER JOIN Trs_Pcs2 on Trs_Pcs2.ID = Trs_Pcs1.ID and Trs_Pcs2.SourceStageID = Panel_StockTable.StageId and Panel_StockTableQty.SizeId = Trs_Pcs2.SizeID and Panel_StockTableQty.CompId = Trs_Pcs2.CompId WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo  And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID And Panel_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0 and Partyid=0 And Trs_PcsGrn1.Id=@Id  
print '3'
End 

Else  

Begin 

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty-@Pcs,ProductionQty=Panel_StockTableQty.ProductionQty-@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=Trs_PcsGrn1.TargetStageId And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotID  and Panel_StockTable.Stageid=Trs_PcsGrn1.TargetStageid And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId = Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=0 And Trs_PcsGrn1.Id=@Id   
print '4'
End  

End  

If @GrnType='Process Return'   

Begin  

SELECT X=1 /*UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Tr
s_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@StageId1 And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@Co
lId And Panel_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo and Panel_Sto
ckTable.Stageid=@StageId1 And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId And Panel_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')=Case Whe
n @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id   */
print '5'
End   

Else   

If @StageId<>1   

Begin  

if @ProcessType='R' 

begin 

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@StageId1 And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotID and Panel_StockTable.Stageid=@StageId1 And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID And Panel_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id  
print '6'
end  

else  

begin  

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@StageId1 And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotID  and Panel_StockTable.Stageid=@StageId1 And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id   
print '7'
end  

End  

End 

If @FinalStage='F'  

Begin  

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Panel' Begin  

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty-@Pcs,ProductionQty=Panel_StockTableQty.ProductionQty-@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=Trs_PcsGrn1.TargetStageId And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotID and Panel_StockTable.Stageid=Trs_PcsGrn1.TargetStageid and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=0 and Panel_StockTableQty.ColId = @ColId And Trs_PcsGrn1.Id=@Id  
print '8'
End 

If @GrnType='Process Return' 

Begin  

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@StageId1 And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotID and Panel_StockTable.Stageid=@StageId1 and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id   
print '9'
End   

Else   

Begin   

If @StageId<>1   

Begin   

if @GrnType <> 'Supplier Order Receipt'  

begin  

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId= @StageId1 And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotID  and Panel_StockTable.Stageid=@StageId1 and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id   
print '10'
end 

End   

End   

End

   End 
   
   
    FETCH NEXT FROM LINE_CURSOR_DELETE INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs  ,@CompID     END  CLOSE LINE_CURSOR_DELETE   DEALLOCATE LINE_CURSOR_DELETE    SET NOCOUNT OFF  
	
	END 