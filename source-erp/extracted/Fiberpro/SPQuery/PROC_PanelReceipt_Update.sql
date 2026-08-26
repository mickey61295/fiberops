/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  SWETHA

; Last Change Date :  05/07/2023 09.15 AM 

; =============================================  */  

CREATE PROCEDURE PROC_PanelReceipt_Update (@Id Int,@StyleNo Varchar(20),@ColID Int,@PartId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15),@CompID Int) AS  DECLARE @Coycode Int,@Ordid Int,@StageId Int,@GodId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int ,@OldId Int,@OldCoycode Int,@OldOrdid Int,@OldStyleNo Varchar(20),@OldStageId Int,@OldPartId Int,@OldGodId Int,@OldColId Int,@OldSizeId Int,@OldStockQty Int,@OldSourceStageId Int,  @OldFinalStage Char(1),@OldSeqNo int,@OldPartyId Int,@OldPcsStockId Int,@OldStageId1 Int,@StageId1 Int,@OldGrnType varchar(20),@GrnType varchar(20),@ProcessType Char(1),@RejectionTypeId Int   ,@DCStageID Int  ,@LotId Int,@SemiFinishDept Varchar(1)     

Select @OldId=@Id   

Select @OldCoycode = Coycode From Trs_PcsGrn1 Where Id=@OldId     

select @OldPartyId = Party From	 Trs_PcsGrn1 Where Id=@OldId    

SELECT @OldOrdid = Ordjob From Trs_PcsGrn1 Where Id=@OldId    

SELECT @OldStyleNo = @StyleNo    

SELECT @OldStageid = TargetStageId From Trs_PcsGrn1 Where Id=@OldId    

SELECT @OldPartId = @PartId      

SELECT @OldGodId = GodId From Trs_PcsGrn1 Where Id=@OldId     

SELECT @ProcessType = ProcessType from Trs_PcsGrn1 where id=@oldid     

SELECT @RejectionTypeId = Trs_Pcs1.RejectionTypeId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id  Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) where Trs_PcsGrn1.id=@OldId  and    isnull(Trs_PcsGrn2.CompID,0) =@CompId 

Select @OldSeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@StageId  
SELECT @OldFinalStage = Mas_Dept.SemiFinish From Trs_PcsGrn1 Inner Join Mas_JobWrkComp On Trs_PcsGrn1.TargetStageID=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsGrn1.Id=@OldId      

SELECT @OldColId = @ColId    

SELECT @OldSizeId = @SizeId  

SELECT @OldStockQty = RecPcs from trs_Pcsgrn2 where Id = @ID and StyleNo = @StyleNo And colId = @ColId and PartId = @PartID And SizID = @SizeId And LotNo= @LotNo  	 and    isnull(Trs_PcsGrn2.CompID,0) =@CompId 

Select @OldGrnType = GrnType from trs_pcsgrn1 Where Id=@OldId    

SELECT @DCStageID = Trs_Pcs1.TargetStageID from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob  And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) where Trs_PcsGrn1.id=@OldId     and    isnull(Trs_PcsGrn2.CompID,0) =@CompId 

/*

SELECT @CompID = IsNull(Trs_Pcs1.CompID,0) from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.Or


dJob  And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@OldId     */

IF ltrim(@LotNo)<>'' 

SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)  

ELSE  

SELECT @LotId = 0   

Select @SemiFinishDept=Mas_Dept.SEMIFINISH From Mas_Dept INNER JOIN Trs_PcsGrn1 ON Trs_PcsGrn1.Dept=Mas_Dept.DeptID Where Trs_PcsGrn1.ID=@Id   If @oldGrnType='Process Return'    

Begin     

If @SemiFinishDept='F'  

Select @OldStageId1 = Trs_Pcs1.TargetStageId From Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On    Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob INNER JOIN  Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And   Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo   and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0)  Where Trs_PcsGrn1.id=@OldId  and    isnull(Trs_PcsGrn2.CompID,0) =@CompId   	

Else	     

Select @OldStageId1 = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join  Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo  and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0)  Where Trs_PcsGrn1.id=@OldId  and    isnull(Trs_PcsGrn2.CompID,0) =@CompId  

End  	

Else  

Begin  	

SELECT @OldStageId1 = TargetStageId From Trs_PcsGrn1 Where Id=@OldId  

if @OldStageId1 <> @DCStageID 

begin  

SELECT @OldStageId1 = @DCStageID  

end 

End   

begin  	

If @OldFinalStage='S'  

Begin  	

If @OldGrnType='Process Return'  

Begin  print 'a' 

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId   and Stageid=@OldStageId1 and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End  
print @OldStockQty
print '@OldStockQty'
print @OldStockQty
print '@OldStockQty'
print @OldStageId1
print '@OldStageId1'
print @CompId
print '@CompId'
End  

Else 

Begin  

if @ProcessType<>'R'  

begin 

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId  and Stageid=@OldStageid1 and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0  

End   

if @ProcessType='R'  

begin print 'c'  

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and 	StyleNo=@OldStyleNo And LotId = @LotId  and Stageid=@OldStageid1 and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId  

end 

End  

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageid1)='Panel'  

Begin  print 'd'  

If @OldGrnType='Process Return'       /*swetha*/

BEGIN

select @OldStageId = Trs_Pcs2.SourceStageID from Trs_PcsGrn1 INNER JOIN Trs_Pcs1 ON Trs_PcsGrn1.Ourdcref = Trs_Pcs1.ID INNER JOIN Trs_Pcs2 ON Trs_Pcs2.ID = Trs_Pcs1.ID  where Trs_PcsGrn1.ID = @id and Trs_Pcs2.CompID = @CompId
print '1'
print @OldStageId
END

else 

BEGIN

SELECT @OldStageId = TargetStageId FROM Trs_PcsGrn1 where id =@id  
print '2'
End

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@OldStockQty+@Pcs,Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty-@OldStockQty  From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId and Stageid=@OldStageId and PartId=@OldPartId and GodId=@OldGodId and PartyId=0 and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0   

print @OldStageId
print '@OldStageId'
End  

End   

If @OldFinalStage='F'  

Begin  

If @OldGrnType='Process Return'  

Begin  print 'e'

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId  and Stageid=@OldStageid1 and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End  

End 

Else  

Begin  

if @ProcessType='R'  

begin  /*Edit Time, Add the OldStockQty in Mistake Pcs*/   print 'f'  

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId  and Stageid=@OldStageid1 and GodId=@OldGodId and PartyId=@OldPartyId and  Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId    

end  

Else   

Begin  print 'g' 

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId  and Stageid=@OldStageid1 and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0    

End   

End    

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageid1)='Panel'   

Begin   print 'h' 

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@OldStockQty,Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty-@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId and Stageid=@OldStageId and GodId=@OldGodId and PartyId=0 and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0   

End   

End   

End   

Select @Id=@Id 

Select @Coycode = Coycode From Trs_PcsGrn1 Where Id=@Id   

select @PartyId = Party From Trs_PcsGrn1 Where Id=@Id   

SELECT @Ordid = Ordjob From Trs_PcsGrn1 Where Id=@Id     

SELECT @StyleNo = @StyleNo  

SELECT @Stageid = TargetStageId From Trs_PcsGrn1 Where Id=@Id   

SELECT @PartId = @PartId    

SELECT @GodId = GodId From Trs_PcsGrn1 Where Id=@Id   

Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@Ordid And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@StageId   SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_PcsGrn1 Inner Join Mas_JobWrkComp On Trs_PcsGrn1.TargetStageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsGrn1.Id=@Id   

SELECT @ColId = @ColId  

SELECT @SizeId = @SizeId   

SELECT @StockQty = @Pcs    

Select @GrnType = GrnType from trs_pcsgrn1 Where Id=@Id    

If @GrnType='Process Return'    

Begin   

select @StageId1 = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.Lotno = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) where Trs_PcsGrn1.id=@Id  and    isnull(Trs_PcsGrn2.CompID,0) =@CompId   

End    

Else    

Begin   

SELECT @StageId1 = TargetStageId From Trs_PcsGrn1 Where Id=@Id   

if @StageId1 <> @DCStageID   

begin   

SELECT @StageId1 = @DCStageID   

end   

End   

begin    

If @FinalStage='S'    

Begin     

If @GrnType='Process Return'    

Begin   print 'i'   

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@StageId1 And LotId = @LotId  and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End    
print @StockQty
print '@StockQty'
print @PartyId
print '@PartyId'
print @StageId1
print '@StageId1'
End    

Else    

Begin    

if @ProcessType='R'   

begin   print 'j'  

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And   LotId = @LotId  and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId  

end   

else  

begin   print 'l'

 Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId  and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0   

end   

End    

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Panel'    

Begin   

SELECT k =0 print 'm'  /*Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@StockQty,Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty+@StockQty  From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@StageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0     */  

End    

End     

If @FinalStage='F'    

Begin    

If @GrnType='Process Return'    

Begin   print 'n'   

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@StageId1 and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId  End    

End    

Else   

Begin    

if @ProcessType='R'   

Begin   print 'o'    

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@Stageid1 and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId     

End   

Else   

Begin   print 'p'  

Update Panel_StockTableQty Set  Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@Stageid1 and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0     

 End   

 End     

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Panel'     

 Begin   print 'q'   

  Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@StockQty,Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty+@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@StageId and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0     
  
 End    
 
 End   
 
 End 